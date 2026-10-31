"use client";

import { brandInfo, brandLogoSources } from "@/features/accounts/model/brands";
import { gameLabel, gameLogoSources } from "@/features/accounts/model/games";
import type { SavingsAccount } from "@/features/data/model/types";
import Monogram from "@/shared/ui/Monogram/Monogram";
import RemoteLogo from "@/shared/ui/RemoteLogo/RemoteLogo";

interface AccountMarkProps {
  account: SavingsAccount;
}

// An account's round picture: its game, its bank, its first coin or its emoji
const AccountMark = ({ account }: AccountMarkProps) => {
  if (account.kind === "skins") {
    return (
      <RemoteLogo
        sources={gameLogoSources(account.game, account.gameLogo)}
        fallback={account.icon}
        alt={gameLabel(account.game, account.gameName) ?? ""}
        size={30}
      />
    );
  }
  const brand = brandInfo(account.bank);
  if (brand) {
    return (
      <RemoteLogo
        sources={brandLogoSources(brand.id)}
        fallback={<Monogram name={brand.name} color={brand.color} />}
        alt={brand.name}
      />
    );
  }
  const coinIcon = account.kind === "crypto" ? account.holdings?.find((holding) => holding.icon)?.icon : undefined;
  if (coinIcon) return <RemoteLogo sources={[coinIcon]} fallback={account.icon} />;
  return account.icon;
};

export default AccountMark;
