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

export type Member = {
  id: number;
  firstName: string;
  lastName: string;
  projectRole?: string;
};

class MentionOption extends MenuOption {
  memberId: number;
  name: string;
  projectRole?: string;

  constructor(memberId: number, name: string, projectRole?: string) {
    super(name);
    this.memberId = memberId;
    this.name = name;
    this.projectRole = projectRole;
  }
}

type MentionMenuProps = {
  options: MentionOption[];
  selectedIndex: number | null;
  selectOptionAndCleanUp: (option: MentionOption) => void;
  setHighlightedIndex: (index: number) => void;
  anchorElementRef: React.MutableRefObject<HTMLElement | null>;
};

function MentionMenu({ options, selectedIndex, selectOptionAndCleanUp, setHighlightedIndex, anchorElementRef }: MentionMenuProps) {
  return createPortal(
    <ul className="mention-dropdown">
      {options.map((option, index) => {
        const isSelected = selectedIndex === index;
        return (
          <li
            key={option.memberId}
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
            {option.projectRole && (
              <span className="mention-dropdown__role">{option.projectRole}</span>
            )}
          </li>
        );
      })}
    </ul>,
    anchorElementRef.current,
  );
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
      .map((m) => new MentionOption(m.id, `${m.firstName} ${m.lastName}`, m.projectRole))
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
        return (
          <MentionMenu
            options={options}
            selectedIndex={selectedIndex}
            selectOptionAndCleanUp={selectOptionAndCleanUp}
            setHighlightedIndex={setHighlightedIndex}
            anchorElementRef={anchorElementRef}
          />
        );
      }}
    />
  );
}
