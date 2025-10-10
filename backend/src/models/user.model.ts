import mongoose, { Document, Schema } from 'mongoose';

interface IUser extends Document {
    email: string;
    otp: string;
    otpvalidate: Date;
    superAdmin: boolean;
    password: string;
    logging: Date,
}

const userSchema: Schema<IUser> = new Schema(
    {
        email: {
            type: String,
            required: true,
        },
        otp: {
            type: String,
            required: true,
        },
        otpvalidate: {
            type: Date,
            default: () => new Date(Date.now() + 600000),
            required: true,
        },
        superAdmin: { type: Boolean, default: false }, 
        password: { type: String }, 
        logging: {
            type: Date,
            default: Date.now()
        }
    },
    {
        timestamps: true,
    }
);

userSchema.pre('save', function(next) {
    this.logging = new Date();  // Update last activity
    next();
  });
  
export default mongoose.model<IUser>('User', userSchema);
