import {
  updateEncounterDescription,
  upsertEncounterReminder,
} from "@/app/dashboard/actions";
import { appRoutes } from "@/app/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DescriptionTextArea } from "@/encounters/[id]/debounce-text-area";
import EncounterPrep from "@/encounters/[id]/encounter-prep";
import { db } from "@/server/api/db";
import { reminders } from "@/server/api/db/schema";
import { getPageSession } from "@/server/api/utils";
import { encounterById, encounterReminders } from "@/server/encounters";
import { eq } from "drizzle-orm";
import { X } from "lucide-react";
import { revalidatePath } from "next/cache";

export default async function EncounterPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getPageSession();
  if (!session) {
    console.error("No session found, layout should have redirected");
    return <div>No session found</div>;
  }

  return (
    <EncounterPrep
      notesInput={<EncounterDescriptionInput id={params.id} />}
      reminderInput={<EncounterReminderInput id={params.id} />}
    />
  );
}

async function EncounterDescriptionInput(props: { id: string }) {
  const { id } = props;

  const doUpdate = updateEncounterDescription.bind(null, id);

  const session = await getPageSession();

  if (!session) {
    console.log("user not logged in");
    return <div>No session found.</div>;
  }

  const user = session.user;

  const encounter = await encounterById(user.userId, id);

  if (!encounter) {
    return <div>Encounter not found.</div>;
  }

  return (
    <form action={doUpdate}>
      <DescriptionTextArea encounter={encounter} />
    </form>
  );
}

async function EncounterReminderInput(props: { id: string }) {
  const { id } = props;

  const session = await getPageSession();

  if (!session) {
    console.log("user not logged in");
    return <div>No session found.</div>;
  }

  const user = session.user;

  const reminders = await encounterReminders(user.userId, id);

  const createNewReminder = upsertEncounterReminder.bind(null, id);

  return (
    <div className="flex flex-col gap-5">
      <form
        className="flex gap-1 flex-wrap items-center"
        action={createNewReminder}
      >
        <label>
          Reminder
          <Input name="reminder" />
        </label>
        <label>
          Alert after round (0 for every round)
          <Input name="alert_after_round" type="number" className="w-32" />
        </label>
        <Button type="submit">Save</Button>
      </form>
      <div className="flex flex-col gap-2">
        <table>
          <thead>
            <tr>
              <th>Remind after round</th>
              <th>Reminder</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {reminders.map((reminder) => (
              <ReminderRow key={reminder.id} reminder={reminder} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export type Reminder = typeof reminders.$inferSelect;

export interface ReminderEditorProps {
  reminder: Reminder;
}

function ReminderRow(props: ReminderEditorProps) {
  const { reminder } = props;

  return (
    <tr>
      <td>{reminder.alert_after_round}</td>
      <td>{reminder.reminder}</td>
      <td>
        <form
          action={async () => {
            "use server";

            await db.delete(reminders).where(eq(reminders.id, reminder.id));

            revalidatePath(appRoutes.campaigns);
          }}
        >
          <Button variant="destructive" type="submit">
            <X />
          </Button>
        </form>
      </td>
    </tr>
  );
}
