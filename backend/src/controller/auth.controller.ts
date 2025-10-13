import { Router, Request, Response } from 'express';
import User from "../models/user.model";
import sendOTPEmail from '../nodemailer'; 
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Token from "../models/token.model"
interface userRequest extends Request {
    user?: { id: string; email: string };
  }

const generateOTP = async (len: number = 6): Promise<string> => {
    let str = '';
    const choices = '0123456789';
    while (str.length < len) {
        str += choices[Math.floor(Math.random() * choices.length)];
    }
    return str;
};


export const sendOTP = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;
        const otp = await generateOTP();
        const userExist = await User.findOne({email})
        if ( userExist) {
            await User.updateOne(
                { _id: userExist._id }, 
                { $set: { otp, otpvalidate: otpExpiry } }
            );
        }
        await User.create({ email, otp, otpvalidate: new Date(Date.now() + 600000) });
        
        await sendOTPEmail(email, otp);
        return res.status(200).json({ message: 'OTP sent successfully!' });
    } catch (error) {
        console.log('Error occurred:', error);
        return res.status(500).send('An error occurred');
    }
}

export const verifyOTP = async (req: Request, res: Response) => {
    const { email, otp } = req.body;

    const userExist = await User.findOne({ email }).sort({ createdAt: -1 });

    if (!userExist) {
        return res.status(400).json({ message: 'Email does not exist' });
    }

    if (new Date(userExist.otpvalidate) > new Date()) {
        console.log(userExist.otp , "", otp);
        if (userExist.otp == otp) {
            const token = jwt.sign(
                { userId: userExist._id },
                process.env.JWT_SECRET as string || "secret_key",
                { expiresIn: "8h" }
              );
              await Token.create({
                token: token,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 
                isDeleted: false,
                user: userExist._id,
                createdAt: new Date()
              });
              return res.json({ token });
        } else {
            return res.status(400).json({ message: 'OTP is not valid' });
        }
    } else {
        return res.status(400).json({ message: 'OTP is expired, please generate a new OTP.' });
    }
}


export const userDetails = async (req: userRequest, res: Response) => {
    try {
        const userdetail = req.user; 
    const userId = userdetail?.id;
      const user = await User.findById({_id: userId}).select('-otp -otpvalidate ');  
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json({ user: { id: user.id.toString(), email: user.email } });
    } catch (error) {
      console.error('Get me error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }


  export const addPassword  = async (req: userRequest, res: Response) => {
    const { password } = req.body;
    const userdetail = req.user; 
    const userId = userdetail?.id;
    const user = await User.findById({_id: userId});
    if(user) {
        const hashedPassword:string = process.env.SUPERUSER_HASH || ""; // Or user.superUser PasswordHash
        const isValid = await bcrypt.compare(password, hashedPassword);
        if (!isValid) return res.status(401).json({ error: 'Invalid password' });
      
        await User.updateOne({_id: user?._id},{$set: {superAdmin: true, password: hashedPassword}});
        res.json({ success: true });   
    }else {
        return res.json({ message: "Not data found"});
    }
    
  }

  export const disableSuperAdmin = async (req: userRequest, res: Response) => {

    const { password } = req.body;
    const userdetail = req.user; 
    const userId = userdetail?.id;
    const user = await User.findById({_id: userId});
    if(user) {     
        await User.updateOne({_id: user?._id},{$set: {superAdmin: false,}});
       return res.json({ success: true });   
    }else {
        return res.json({ message: "Not data found"});
    }
 }
