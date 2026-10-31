"use client";

import { INZHUR_LOGO } from "@/features/accounts/model/brands";
import type { Investment } from "@/features/data/model/types";
import { inzhurFund } from "@/features/investments/model/inzhur";
import { investmentKind } from "@/features/investments/model/kinds";
import Monogram from "@/shared/ui/Monogram/Monogram";
import RemoteLogo from "@/shared/ui/RemoteLogo/RemoteLogo";

interface PositionMarkProps {
  inv: Investment;
  size?: number;
  coinSize?: number;
}

// A position's picture: its fund's logo, its coin or the emoji of its kind
const PositionMark = ({ inv, size = 22, coinSize = size }: PositionMarkProps) => {
  const fund = inzhurFund(inv.fund);
  const icon = investmentKind(inv.kind).icon;
  if (fund) {
    return (
      <RemoteLogo
        sources={[INZHUR_LOGO]}
        fallback={<Monogram name={fund.name.replace("Inzhur ", "")} color={fund.accent} size={size} />}
        alt={fund.name}
        size={size}
      />
    );
  }
  if (inv.kind === "crypto" && inv.coinIcon)
    return <RemoteLogo sources={[inv.coinIcon]} fallback={icon} size={coinSize} />;
  return icon;
};

export default PositionMark;
