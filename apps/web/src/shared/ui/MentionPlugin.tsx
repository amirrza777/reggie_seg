"use client";

import { useCallback, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { type TextNode } from "lexical";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  LexicalTypeaheadMenuPlugin,
  MenuOption,
  useBasicTypeaheadTriggerMatch,
} from "@lexical/react/LexicalTypeaheadMenuPlugin";
import { $createMentionNode } from "./MentionNode";

type Member = {
  id: number;
  firstName: string;
  lastName: string;
};

class MentionOption extends MenuOption {
  name: string;

  constructor(name: string) {
    super(name);
    this.name = name;
  }
}

type MentionPluginProps = {
  members?: Member[];
};

export function MentionPlugin({ members }: MentionPluginProps) {
  const [editor] = useLexicalComposerContext();
  const [queryString, setQueryString] = useState<string | null>(null);

  const checkForTriggerMatch = useBasicTypeaheadTriggerMatch("@", {
    minLength: 0,
  });

  const options = useMemo(() => {
    const query = queryString?.toLowerCase() ?? "";
    const availableMembers = Array.isArray(members) ? members : [];
    return availableMembers
      .map((m) => new MentionOption(`${m.firstName} ${m.lastName}`))
      .filter((option) => option.name.toLowerCase().includes(query));
  }, [members, queryString]);

  const onSelectOption = useCallback(
    (
      selectedOption: MentionOption,
      nodeToReplace: TextNode | null,
      closeMenu: () => void,
    ) => {
      editor.update(() => {
        const mentionNode = $createMentionNode(selectedOption.name);
        if (nodeToReplace) {
          nodeToReplace.replace(mentionNode);
        }
        mentionNode.select();
        closeMenu();
      });
    },
    [editor],
  );

  return (
    <LexicalTypeaheadMenuPlugin<MentionOption>
      onQueryChange={setQueryString}
      onSelectOption={onSelectOption}
      triggerFn={checkForTriggerMatch}
      options={options}
      menuRenderFn={(anchorElementRef, { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex }) => {
        if (options.length === 0 || !anchorElementRef.current) {
          return null;
        }

        return createPortal(
          <ul className="mention-dropdown">
            {options.map((option, index) => {
              const isSelected = selectedIndex === index;
              return (
                <li
                  key={option.key}
                  ref={option.setRefElement}
                  className={
                    isSelected
                      ? "mention-dropdown__item mention-dropdown__item--active"
                      : "mention-dropdown__item"
                  }
                  onClick={() => selectOptionAndCleanUp(option)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  role="option"
                  aria-selected={isSelected}
                >
                  {option.name}
                </li>
              );
            })}
          </ul>,
          anchorElementRef.current,
        );
      }}
    />
  );
}
