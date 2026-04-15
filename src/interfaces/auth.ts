import { BaseUser } from "@/models/User";

export interface StudentRegister extends BaseUser {
    guardianName: string;
    guardianEmail: string;
    guardianPhoneNumber: string;
}