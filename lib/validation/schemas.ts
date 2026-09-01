import { z } from "zod";

export const packageJsonUploadSchema = z.object({
  fileContent: z.string().min(2, "File appears to be empty.").max(2_000_000, "File is too large to analyze.")
});

export const githubAnalyzeSchema = z.object({
  url: z
    .string()
    .trim()
    .min(3, "Please provide a GitHub repository URL.")
    .max(500, "URL is too long.")
});

const depGroupSchema = z.record(z.string()).optional();

export const packageJsonShapeSchema = z.object({
  name: z.string().optional(),
  version: z.string().optional(),
  dependencies: depGroupSchema,
  devDependencies: depGroupSchema,
  peerDependencies: depGroupSchema,
  optionalDependencies: depGroupSchema
});
