import { execSync } from "child_process";

export interface GitCommit {
  hash: string;
  message: string;
  date: string;
}

export function getRecentCommits(count = 3): GitCommit[] {
  try {
    const output = execSync(
      `git log --pretty=format:"%h|||%s|||%ad" --date=short -${count}`,
      { encoding: "utf8", cwd: process.cwd() },
    );
    return output
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [hash, message, date] = line.split("|||");
        return { hash: hash ?? "", message: message ?? "", date: date ?? "" };
      });
  } catch {
    return [];
  }
}
