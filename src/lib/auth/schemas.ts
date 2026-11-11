import { z } from "zod";

const email = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address."));

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
  next: z.string().optional(),
});

export const signUpSchema = z.object({
  fullName: z.string().trim().min(1, "Enter your name.").max(120, "Keep it under 120 characters."),
  email,
  password: z
    .string()
    .min(8, "Use at least 8 characters.")
    .max(72, "Use at most 72 characters."), // bcrypt's input limit
});
