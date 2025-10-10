import { Router, Request, Response } from 'express';
import Project from "../models/project.model";

export const createProject =  async (req: Request, res: Response) => {
    try {
        await Project.create({name: req.body.name})
    } catch (error) {
        console.log('Error occurred:', error);
        return res.status(500).send('An error occurred');
    }
}

export const listProject = async (req: Request, res: Response) => {
    const list = await Project.find();
    const count = await Project.countDocuments();
 
    if(list.length > 0) {
     return res.status(200).json({
         count,
         list
     })
    }else {
     return res.status(200).json({
         count: 0,
         list: []
     })
    }
 }

 