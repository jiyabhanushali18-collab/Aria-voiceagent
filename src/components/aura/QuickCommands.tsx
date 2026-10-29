import { useCallback } from "react";
import { MicIcon } from "./Icons";

interface Props {
  onSend: (text: string) => void;
}

/**
 * A small panel of common customer queries.
 * Clicking a button sends the associated text through the voice
 * assistant's `onSendText` handler (or falls back to the text input).
 */
export function QuickCommands({ onSend }: Props) {
  const commands = [
    { label: "Where is my order?", text: "Where is my order?" },
    { label: "Can I cancel my order?", text: "Can I cancel my order?" },
    { label: "What is your return policy?", text: "What is your return policy?" },
    { label: "My product arrived damaged", text: "My product arrived damaged" },
    { label: "What are the shipping charges?", text: "What are the shipping charges?" },
    { label: "Is cash on delivery available?", text: "Is cash on delivery available?" },
  ];

  const handle = useCallback(
    (t: string) => () => {
      onSend(t);
    },
    [onSend]
  );

  return (
    <section
      className="panel mt-8 rounded-[20px] bg-surface/60 p-6"
      aria-labelledby="quick-commands-title"
    >
      <h3
        id="quick-commands-title"
        className="font-serif text-lg text-forest mb-4"
      >
        Quick actions
      </h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {commands.map((c) => (
          <button
            key={c.label}
            onClick={handle(c.text)}
            className="press flex items-center gap-2 rounded-full bg-forest px-4 py-2 text-sm font-medium text-on-dark hover:bg-olive"
          >
            <MicIcon className="size-4" />
            {c.label}
          </button>
        ))}
      </div>
    </section>
  );
}
