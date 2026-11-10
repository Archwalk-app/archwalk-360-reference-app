// Illustrative hotel integration concept. No claim is made about Zesora's real
// room numbers, room-count distribution, or a live booking-system connection.
export const PLUGIN_RESORT = {
  id: "zesora_concept_demo",
  name: "Zesora Nathia Gali",
  location: "Nathia Gali · Galiyat Hills",
} as const;

// Real public-facing room category names, but TWO FICTITIOUS room IDs per type
// purely to demonstrate shared ArchWalk Experiences (18 sample IDs in total).
export const PLUGIN_VARIANT_SPECS = [
  { id: "deluxe_king", name: "Deluxe King Valley", roomCount: 2 },
  { id: "deluxe_twin", name: "Deluxe Twin Valley", roomCount: 2 },
  { id: "deluxe_interconnecting", name: "Deluxe Interconnecting Room", roomCount: 2 },
  { id: "executive_king", name: "Executive King Valley", roomCount: 2 },
  { id: "executive_twin", name: "Executive Twin Valley", roomCount: 2 },
  { id: "executive_interconnecting", name: "Executive Interconnecting Room", roomCount: 2 },
  { id: "standard_king", name: "Standard King Valley", roomCount: 2 },
  { id: "standard_twin", name: "Standard Twin Valley", roomCount: 2 },
  { id: "standard_interconnecting", name: "Standard Interconnecting Room", roomCount: 2 },
] as const;

export type PluginStatus =
  | "Not configured"
  | "Draft"
  | "Published"
  | "Needs attention";

export type PluginVariant = {
  id: string;
  name: string;
  room_count: number;
  room_numbers: string[];
  external_customer_id: string;
  external_resource_id: string;
};

export type PluginRoom = {
  room_number: string;
  variant_id: string;
};

export type PluginInventory = {
  resort: {
    id: string;
    name: string;
    location: string;
    external_customer_id: string;
  };
  physical_room_count: number;
  visual_variant_count: number;
  rooms: PluginRoom[];
  variants: PluginVariant[];
};

export function pluginExternalResourceId(variantId: string): string {
  return `room_type_${variantId}`;
}

export function buildPluginInventory(
  customerId = PLUGIN_RESORT.id,
): PluginInventory {
  const rooms: PluginRoom[] = [];
  let nextNumber = 101;
  const variants = PLUGIN_VARIANT_SPECS.map((spec) => {
    const roomNumbers: string[] = [];
    for (let index = 0; index < spec.roomCount; index += 1) {
      const number = String(nextNumber);
      nextNumber += 1;
      roomNumbers.push(number);
      rooms.push({ room_number: number, variant_id: spec.id });
    }
    return {
      id: spec.id,
      name: spec.name,
      room_count: spec.roomCount,
      room_numbers: roomNumbers,
      external_customer_id: customerId,
      external_resource_id: pluginExternalResourceId(spec.id),
    };
  });

  return {
    resort: {
      id: PLUGIN_RESORT.id,
      name: PLUGIN_RESORT.name,
      location: PLUGIN_RESORT.location,
      external_customer_id: customerId,
    },
    physical_room_count: rooms.length,
    visual_variant_count: variants.length,
    rooms,
    variants,
  };
}

export function findPluginRoom(inventory: PluginInventory, roomNumber: string) {
  const room = inventory.rooms.find(
    (item) => item.room_number === String(roomNumber),
  );
  if (!room) return null;
  const variant = inventory.variants.find((item) => item.id === room.variant_id);
  if (!variant) return null;
  return { room, variant };
}

export function derivePluginStatus(input: {
  mapping?: { publication_status?: string | null } | null;
  failed?: boolean;
}): PluginStatus {
  if (input.failed) return "Needs attention";
  if (!input.mapping) return "Not configured";
  if (input.mapping.publication_status === "published") return "Published";
  return "Draft";
}
