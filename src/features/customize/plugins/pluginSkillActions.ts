/**
 * Official jX / x8t / try-in-chat residual (index-BELzQL5P.js).
 *   jX(skill) = skill.userInvocable !== false
 *   slash → /task/new?q=/${name}   CCD → /code
 *   auto  → q template + skill-name
 *   customize → x8t q, CCD /code else /task/new
 */

export function isPluginSkillUserInvocable(skill: { userInvocable?: boolean }): boolean {
  return skill.userInvocable !== false;
}

export function pluginSkillTryInChatHref(skillName: string, userInvocable: boolean): string {
  const params = new URLSearchParams(
    userInvocable
      ? { q: `/${skillName}` }
      : {
          q: 'Hey Claude—can you make something amazing with my "{skill-name}" skill?',
          "skill-name": skillName,
        },
  );
  // Official c63a always pushes /task/new (not /epitaxy).
  return `/task/new?${params.toString()}`;
}

export function pluginSkillCustomizeHref(
  pluginName: string,
  isCcd: boolean,
  specificItemName?: string,
): string {
  const q = specificItemName
    ? `Customize the "${specificItemName}" skill of the "${pluginName}" plugin for me based on my company`
    : `Customize the "${pluginName}" plugin for me based on my company`;
  return `${isCcd ? "/code" : "/task/new"}?${new URLSearchParams({ q }).toString()}`;
}
