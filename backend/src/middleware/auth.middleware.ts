import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import Token from "../models/token.model";

export interface AuthRequest extends Request {
  user?: string | JwtPayload;
}

export default async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers["token"] as string | undefined;
console.log(token)
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    let decoded: string | JwtPayload;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET as string);
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }

    const tokenDoc = await Token.findOne({ token, isDeleted: false }).sort({createdAt: -1});
    console.log(tokenDoc)
    if (!tokenDoc || tokenDoc.expiresAt < new Date()) {
      return res.status(401).json({ error: "Token expired or revoked" });
    }

    req.user = decoded;

    return next();
  } catch (err) {
    console.error("Auth error:", err);
    return res.status(500).json({ error: "Authentication failed" });
  }
};
