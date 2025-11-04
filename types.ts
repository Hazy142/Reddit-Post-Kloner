export interface RedditAward {
  id: string;
  name: string;
  count: number;
  icon_url: string;
}

export interface RedditPostData {
  id: string;
  title: string;
  selftext: string;
  author: string;
  subreddit: string;
  score: number;
  num_comments: number;
  created_utc: number;
  permalink: string;
  all_awardings: RedditAward[];
  authorProfilePic?: string;
  subreddit_name_prefixed: string;
  link_flair_text?: string | null;
  total_awards_received?: number;
  upvote_ratio: number;
  gilded: number;
}