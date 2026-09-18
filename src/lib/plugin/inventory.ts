export const PLUGIN_RESORT = {
  id: "blue_lagoon",
  name: "Blue Lagoon Resort",
  location: "Coastal Maldives",
} as const;

export const PLUGIN_VARIANT_SPECS = [
  { id: "deluxe_king", name: "Deluxe King", roomCount: 42 },
  { id: "ocean_king", name: "Ocean King", roomCount: 31 },
  { id: "garden_twin", name: "Garden Twin", roomCount: 28 },
  { id: "executive_suite", name: "Executive Suite", roomCount: 22 },
  { id: "family_suite", name: "Family Suite", roomCount: 24 },
  { id: "accessible_king", name: "Accessible King", roomCount: 16 },
  { id: "one_bedroom_villa", name: "One Bedroom Villa", roomCount: 20 },
  { id: "two_bedroom_villa", name: "Two Bedroom Villa", roomCount: 17 },
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
