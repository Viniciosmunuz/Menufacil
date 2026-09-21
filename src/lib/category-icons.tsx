import {
  Beef,
  Beer,
  CakeSlice,
  Coffee,
  Cookie,
  Croissant,
  CupSoda,
  Drumstick,
  EggFried,
  Fish,
  Ham,
  IceCreamBowl,
  IceCreamCone,
  Package,
  Pizza,
  Popcorn,
  Salad,
  Sandwich,
  Soup,
  Store,
  UtensilsCrossed,
  Wine,
  type LucideIcon,
} from "lucide-react";

// Ícones que o admin pode escolher para as categorias da plataforma. O banco
// guarda só o nome; aqui ele vira o desenho.
export const CATEGORY_ICONS: Record<string, { icon: LucideIcon; label: string }> = {
  sandwich: { icon: Sandwich, label: "Lanche" },
  pizza: { icon: Pizza, label: "Pizza" },
  "cup-soda": { icon: CupSoda, label: "Bebida" },
  drumstick: { icon: Drumstick, label: "Frango / porção" },
  "cake-slice": { icon: CakeSlice, label: "Bolo / sobremesa" },
  soup: { icon: Soup, label: "Prato de comida" },
  package: { icon: Package, label: "Marmita / embalagem" },
  fish: { icon: Fish, label: "Peixe / japonesa" },
  "ice-cream-bowl": { icon: IceCreamBowl, label: "Açaí / tigela" },
  "ice-cream-cone": { icon: IceCreamCone, label: "Sorvete" },
  "utensils-crossed": { icon: UtensilsCrossed, label: "Talheres" },
  beef: { icon: Beef, label: "Carne / churrasco" },
  salad: { icon: Salad, label: "Salada / saudável" },
  coffee: { icon: Coffee, label: "Café" },
  croissant: { icon: Croissant, label: "Padaria" },
  beer: { icon: Beer, label: "Cerveja" },
  wine: { icon: Wine, label: "Vinho" },
  cookie: { icon: Cookie, label: "Doce / biscoito" },
  "egg-fried": { icon: EggFried, label: "Café da manhã" },
  ham: { icon: Ham, label: "Frios" },
  popcorn: { icon: Popcorn, label: "Petisco" },
};

export function CategoryIcon({ name, className }: { name: string | null | undefined; className?: string }) {
  const Icon = (name && CATEGORY_ICONS[name]?.icon) || Store;
  return <Icon className={className} aria-hidden="true" />;
}
