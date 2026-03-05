export type TrelloList = {
    id: string;
    name: string;
  };
  
  export type TrelloMember = {
    id: string;
    fullName: string;
    initials?: string;
  };
  
  export type TrelloCard = {
    id: string;
    name: string;
    idList: string;
    desc?: string;
    due?: string | null;
    dateLastActivity?: string;
    idMembers?: string[];
    members?: TrelloMember[];
    labels?: { id: string; name: string }[];
  };
  
  export type TrelloBoardAction = {
    id: string;
    type: "createCard" | "updateCard";
    date: string;
    data?: {
      list?: { id: string; name?: string };
      listAfter?: { id: string; name?: string };
      listBefore?: { id: string; name?: string };
      card?: { id: string; name?: string };
    };
  };
  
  export type TrelloBoardDetail = {
    id: string;
    name: string;
    url?: string;
    lists?: TrelloList[];
    cards?: TrelloCard[];
    members?: TrelloMember[];
    actions?: TrelloBoardAction[];
  };
  