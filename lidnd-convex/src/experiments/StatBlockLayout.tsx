import { useState } from "react";
import { StatBlockBoard } from "@/creatures/StatBlockBoard";
import { Button } from "@/components/ui/button";
import "@/index.css";

// Synthetic sheets deliberately use different text densities and aspect ratios.
// This entry point is served by Vite for design review, not linked from the app.
function sheet(name: string, width: number, height: number, columns = 1) {
  const columnWidth = (width - 48) / columns;
  const content = Array.from({ length: columns }, (_, column) => {
    const x = 24 + column * columnWidth;
    return Array.from(
      { length: Math.floor((height - 120) / 100) },
      (_, row) => {
        const y = 125 + row * 100;
        return `<text x="${x}" y="${y}" font-weight="bold" font-size="17">${["Traits", "Actions", "Reactions", "Special abilities", "Tactics", "Resources", "Triggered actions", "Last stand", "Rewards"][row % 9]}</text>
      <path d="M${x} ${y + 10}h${columnWidth - 20}" stroke="#b4b8ad"/>
      <text x="${x}" y="${y + 32}" font-size="14">Strike. Reach 5; one target.</text>
      <text x="${x}" y="${y + 53}" font-size="14">On a hit, deal 8 damage.</text>
      <text x="${x}" y="${y + 74}" font-size="14">The target can shift 1 square.</text>`;
      },
    ).join("");
  }).join("");
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#f7f4e9"/><rect width="100%" height="7" fill="#476050"/><g fill="#27392e" font-family="Georgia, serif"><text x="24" y="44" font-size="25" font-weight="bold">${name}</text><text x="24" y="70" font-size="14">Layout sample · Fictional creature</text><text x="24" y="96" font-size="15">AC 16   |   HP 48   |   Speed 30 ft.</text>${content}</g></svg>`)}`;
}
const blocks = [
  {
    id: "scout",
    name: "Briar Scout · quarter page",
    url: sheet("Briar Scout", 408, 528),
  },
  {
    id: "guard",
    name: "Thorn Guard · half page",
    url: sheet("Thorn Guard", 408, 850),
  },
  {
    id: "warden",
    name: "Hollow Warden · full page",
    url: sheet("Hollow Warden", 816, 1056, 2),
  },
];

export default function Experiment() {
  const [selected, setSelected] = useState("scout");
  const [narrow, setNarrow] = useState(false);
  return (
    <main className="mx-auto max-w-7xl p-4 sm:p-8">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">
        Layout experiment
      </p>
      <h1 className="mt-2 text-2xl font-semibold">
        Different sheets. One encounter.
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Give dense sheets more room with Widen. Click a sheet to read it.
        Selecting a creature keeps the board in place.
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        {blocks.map((block) => (
          <Button
            key={block.id}
            size="sm"
            variant={selected === block.id ? "secondary" : "outline"}
            onClick={() => setSelected(block.id)}
          >
            {block.name.split(" ·")[0]}
          </Button>
        ))}
        <Button
          size="sm"
          variant="outline"
          aria-pressed={narrow}
          onClick={() => setNarrow(!narrow)}
        >
          Narrow pane
        </Button>
      </div>
      <div
        className="mt-5 rounded-lg border bg-muted/30 p-3 sm:p-4"
        style={{ maxWidth: narrow ? 440 : 860 }}
      >
        <StatBlockBoard blocks={blocks} selectedId={selected} />
      </div>
    </main>
  );
}
