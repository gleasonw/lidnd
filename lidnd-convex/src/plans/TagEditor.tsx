import { toastError } from "@/lib/errors";
import { Cross2Icon } from "@radix-ui/react-icons";
import { useMutation, useQuery } from "convex/react";
import { useId, useState } from "react";
import { api } from "../../convex/_generated/api";
import { PlanData } from "./types";

export function TagEditor({ data }: { data: PlanData }) {
  const allTags = useQuery(api.plans.listTags, {
    campaignId: data.campaign._id,
  });
  const add = useMutation(api.plans.addTag);
  const remove = useMutation(api.plans.removeTag);
  const [name, setName] = useState("");
  const listId = useId();
  const suggestions = (allTags ?? []).filter(
    (t) => !data.tags.some((attached) => attached._id === t._id),
  );

  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-label="Tags">
      {data.tags.map((tag) => (
        <span
          key={tag._id}
          className="inline-flex items-center gap-1 rounded-full border py-0.5 pl-2.5 pr-1 text-xs"
        >
          {tag.name}
          <button
            type="button"
            aria-label={`Remove tag ${tag.name}`}
            className="rounded-full p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={() =>
              void remove({ planId: data.plan._id, tagId: tag._id }).catch(
                toastError,
              )
            }
          >
            <Cross2Icon className="h-3 w-3" />
          </button>
        </span>
      ))}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim() === "") return;
          add({ planId: data.plan._id, name })
            .then(() => setName(""))
            .catch(toastError);
        }}
      >
        <input
          aria-label="Add tag"
          placeholder="+ tag"
          list={listId}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-6 w-24 rounded-full border border-dashed bg-transparent px-2.5 text-xs outline-none focus:w-36 focus:border-solid focus:ring-1 focus:ring-ring"
        />
        <datalist id={listId}>
          {suggestions.map((t) => (
            <option key={t._id} value={t.name} />
          ))}
        </datalist>
      </form>
    </div>
  );
}
