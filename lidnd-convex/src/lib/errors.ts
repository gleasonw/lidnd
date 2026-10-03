import { ConvexError } from "convex/values";
import { toast } from "sonner";

export function errorMessage(error: unknown) {
  if (error instanceof ConvexError && typeof error.data === "string") {
    return error.data;
  }
  return "Something went wrong. Try again.";
}

export function toastError(error: unknown) {
  toast.error(errorMessage(error));
}
