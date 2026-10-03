import { FunctionReturnType } from "convex/server";
import { api } from "../../convex/_generated/api";

export type PlanData = NonNullable<FunctionReturnType<typeof api.plans.get>>;
export type PlanParticipant = PlanData["participants"][number];
