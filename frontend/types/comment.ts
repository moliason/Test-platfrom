type CommentType = {
  id: number;
  commentableType: 'RunCase' | 'Run' | 'Case';
  commentableId: number;
  userId: number;
  content: string;
  createdAt: string;
  updatedAt: string;
  User: {
    id: number;
    username: string;
    email: string;
  };
};

type CommentMessages = {
  comments: string;
  noComments: string;
  addComment: string;
  save: string;
  cancel: string;
  placeholder: string;
  notIncludedInRun: string;
  commentAdded: string;
  failedToAddComment: string;
  commentUpdated: string;
  failedToUpdateComment: string;
  commentDeleted: string;
  failedToDeleteComment: string;
};

export type { CommentType, CommentMessages };
