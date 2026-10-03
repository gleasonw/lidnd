import { FunctionReturnType } from "convex/server";
import { api } from "../../convex/_generated/api";

export type RunData = NonNullable<FunctionReturnType<typeof api.runs.get>>;
export type RunParticipant = RunData["participants"][number];
