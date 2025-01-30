import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { type DbSpell, status_effects, spells } from "@/server/db/schema";

type Entry = {
  type: string;
  name?: string;
  entries?: (string | Entry)[];
};

interface Spell {
  name: string;
  source: string;
  page: number;
  srd: boolean;
  basicRules: boolean;
  level: number;
  school: string;
  time: Array<{ number: number; unit: string }>;
  range: {
    type: string;
    distance: {
      type: string;
      amount: number;
    };
  };
  components: {
    v: boolean;
    s: boolean;
    m?: boolean; // Assuming 'm' can be a component but is optional
  };
  duration: Array<{ type: string; duration?: number }>; // Assuming there might be a duration number
  entries: (string | Entry)[];
  scalingLevelDice: {
    label: string;
    scaling: {
      [level: number]: string;
    };
  };
  damageInflict: string[];
  savingThrow: string[];
  miscTags: string[];
  areaTags: string[];
}

interface SpellBook {
  spell: Spell[];
}

const db_url =
  process.env.NODE_ENV === "production"
    ? process.env.DATABASE_URL
    : "postgresql://postgres:postgres@localhost:5432/dnd";
if (!db_url) {
  throw new Error("DATABASE_URL not set");
}
const sql = postgres(db_url, { max: 1 });
const db = drizzle(sql);

async function parseResponse(response: Response) {
  const json = (await response.json()) as SpellBook;
  return json.spell;
}

async function fetchPbSpells() {
  const response = await fetch(
    "https://raw.githubusercontent.com/5etools-mirror-1/5etools-mirror-1.github.io/master/data/spells/spells-phb.json"
  );
  return parseResponse(response);
}

async function fetchXgeSpells() {
  const response = await fetch(
    "https://raw.githubusercontent.com/5etools-mirror-1/5etools-mirror-1.github.io/master/data/spells/spells-xge.json"
  );
  return parseResponse(response);
}

async function fetchTceSpells() {
  const response = await fetch(
    "https://raw.githubusercontent.com/5etools-mirror-1/5etools-mirror-1.github.io/master/data/spells/spells-tce.json"
  );
  return parseResponse(response);
}

const spellResponses = await Promise.allSettled([
  fetchPbSpells(),
  fetchXgeSpells(),
  fetchTceSpells(),
]);

function entriesToString(entries: (string | Entry)[]): string {
  return entries
    .map((entry) => {
      if (typeof entry === "string") {
        return entry;
      }
      return entry.entries ? entriesToString(entry.entries) : "";
    })
    .join("\n\n");
}

const parsedSpells = spellResponses.reduce((acc, response) => {
  if (response.status === "fulfilled") {
    return acc.concat(
      response.value.map((spell) => ({
        ...spell,
        time: `${spell.time[0]?.number} ${spell.time[0]?.unit}`,
        range:
          spell.range.distance &&
          `${spell.range.distance.amount} ${spell.range.distance.type} ${spell.range.type}`,
        components: `${spell.components.v ? "V" : ""} ${
          spell.components.s ? "S" : ""
        } ${spell.components.m ? "M" : ""}`,
        duration: `${spell.duration[0]?.duration} ${spell.duration[0]?.type}`,
        entries: entriesToString(spell.entries),
        scalingLevelDice:
          spell.scalingLevelDice &&
          spell.scalingLevelDice.scaling &&
          `${spell.scalingLevelDice?.label} ${Object.entries(
            spell.scalingLevelDice?.scaling
          )
            .map(([level, dice]) => `${level}: ${dice}`)
            .join(", ")}`,
        damageInflict: spell.damageInflict?.join(", "),
        savingThrow: spell.savingThrow?.join(", "),
        miscTags: spell.miscTags?.join(", "),
        areaTags: spell.areaTags?.join(", "),
      }))
    );
  }
  return acc;
}, [] as DbSpell[]);

await db.insert(spells).values(parsedSpells).onConflictDoNothing();

await db
  .insert(status_effects)
  .values([
    {
      name: "Blinded",
      description:
        "A blinded creature can’t see and automatically fails any ability check that requires sight. Attack rolls against the creature have advantage, and the creature’s attack rolls have disadvantage.",
    },
    {
      name: "Charmed",
      description:
        "A charmed creature can’t attack the charmer or target the charmer with harmful abilities or magical effects. The charmer has advantage on any ability check to interact socially with the creature.",
    },
    {
      name: "Deafened",
      description:
        "A deafened creature can’t hear and automatically fails any ability check that requires hearing.",
    },
    {
      name: "Frightened",
      description:
        "A frightened creature has disadvantage on ability checks and attack rolls while the source of its fear is within line of sight. The creature can’t willingly move closer to the source of its fear.",
    },
    {
      name: "Grappled",
      description:
        "A grappled creature’s speed becomes 0, and it can’t benefit from any bonus to its speed. The condition ends if the grappler is incapacitated. The condition also ends if an effect removes the grappled creature from the reach of the grappler or grappling effect, such as when a creature is hurled away by the thunderwave spell.",
    },
    {
      name: "Incapacitated",
      description: "An incapacitated creature can’t take actions or reactions.",
    },
    {
      name: "Invisible",
      description:
        "An invisible creature is impossible to see without the aid of magic or a special sense. For the purpose of hiding, the creature is heavily obscured. The creature’s location can be detected by any noise it makes or any tracks it leaves. Attack rolls against the creature have disadvantage, and the creature’s attack rolls have advantage.",
    },
    {
      name: "Paralyzed",
      description:
        "A paralyzed creature is incapacitated and can’t move or speak. The creature automatically fails Strength and Dexterity saving throws. Attack rolls against the creature have advantage. Any attack that hits the creature is a critical hit if the attacker is within 5 feet of the creature.",
    },
    {
      name: "Petrified",
      description:
        "A petrified creature is transformed into a solid inanimate substance (usually stone). Its weight increases by a factor of ten, and it ceases aging. The creature is incapacitated, can’t move or speak, and is unaware of its surroundings. Attack rolls against the creature have advantage. The creature automatically fails Strength and Dexterity saving throws. The creature has resistance to all damage. The creature is immune to poison and disease.",
    },
    {
      name: "Poisoned",
      description:
        "A poisoned creature has disadvantage on attack rolls and ability checks.",
    },
    {
      name: "Prone",
      description:
        "A prone creature’s only movement option is to crawl, unless it stands up and thereby ends the condition. The creature has disadvantage on attack rolls. An attack roll against the creature has advantage if the attacker is within 5 feet of the creature. Otherwise, the attack roll has disadvantage.",
    },
    {
      name: "Restrained",
      description:
        "A restrained creature’s speed becomes 0, and it can’t benefit from any bonus to its speed. Attack rolls against the creature have advantage, and the creature’s attack rolls have disadvantage. The creature has disadvantage on Dexterity saving throws.",
    },
    {
      name: "Stunned",
      description:
        "A stunned creature is incapacitated, can’t move, and can speak only falteringly. The creature automatically fails Strength and Dexterity saving throws. Attack rolls against the creature have advantage.",
    },
    {
      name: "Unconscious",
      description:
        "An unconscious creature is incapacitated, can’t move or speak, and is unaware of its surroundings. The creature drops whatever it’s holding and falls prone. The creature automatically fails Strength and Dexterity saving throws. Attack rolls against the creature have advantage. Any attack that hits the creature is a critical hit if the attacker is within 5 feet of the creature.",
    },
    {
      name: "Exhaustion",
      description:
        "Exhaustion is measured in six levels, with effects ranging from disadvantage on ability checks to death at level 6. Each level also includes effects of all lower levels.",
    },
  ])
  .onConflictDoNothing();

sql.end();
