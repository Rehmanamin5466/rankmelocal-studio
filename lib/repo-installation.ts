import "server-only";

import { getInstallationRepos, getInstallations } from "@/lib/github-app";
import { requireGithubRepoWriteAccess } from "@/lib/authz-server";

// Confirms the signed-in GitHub user can write to owner/repo and that the
// repo is part of this Pages CMS GitHub App installation.
const assertRepoInInstallation = async (
  user: { id: string; githubUsername?: string | null },
  owner: string,
  repo: string
) => {
  const { token, repoAccess } = await requireGithubRepoWriteAccess(
    user,
    owner,
    repo,
    "You must be signed in with GitHub to manage collaborators.",
  );
  const installations = await getInstallations(token, [owner]);
  if (installations.length !== 1) throw new Error(`"${owner}" is not part of your GitHub App installations`);
  const installationRepos = await getInstallationRepos(token, installations[0].id);
  const isInstalledForRepo = installationRepos.some((installationRepo) =>
    installationRepo.id === repoAccess.repoId ||
    (
      installationRepo.owner?.login?.toLowerCase() === owner.toLowerCase() &&
      installationRepo.name?.toLowerCase() === repo.toLowerCase()
    )
  );
  if (!isInstalledForRepo) throw new Error(`"${owner}/${repo}" is not part of your Pages CMS installation.`);

  return {
    repoAccess,
    installation: installations[0],
  };
};

export { assertRepoInInstallation };
