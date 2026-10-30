export const property = {
  name: "Hallwyl Museum",
  location: "Hamngatan 4, Stockholm, Sweden",
  externalListingKey: "sunset-villa-001",
  description:
    "A private home, a collector’s vision, a world preserved. Discover four historic rooms in one of Stockholm’s most remarkable houses.",
} as const;

export const museumRooms = [
  {
    id: "great-drawing-room",
    name: "Great Drawing Room",
    style: "Music & entertaining",
    description:
      "Gilded woodwork, historic Brussels tapestries and a grand piano set the scene for music and entertaining.",
    alt: "Gilded walls, historic tapestries and a grand piano in the Hallwyl Museum’s Great Drawing Room",
    source: "the-great-drawing-room",
  },
  {
    id: "morning-room",
    name: "Morning Room",
    style: "Portraits & everyday life",
    description:
      "Surrounded by family portraits, Wilhelmina received visitors and attended to her correspondence here.",
    alt: "Red walls, family portraits and the fireplace in the Hallwyl Museum’s Morning Room",
    source: "the-morning-room",
  },
  {
    id: "smoking-room",
    name: "Smoking Room",
    style: "Conversation & games",
    description:
      "An intimate setting for evening coffee, conversation and games, furnished with richly patterned textiles.",
    alt: "Warm wood panelling, paintings and patterned furniture in the Hallwyl Museum’s Smoking Room",
    source: "the-smoking-room",
  },
  {
    id: "ladies-drawing-room",
    name: "Ladies’ Drawing Room",
    style: "A Rococo-inspired retreat",
    description:
      "Curved woodwork, antique furniture and tapestries bring together Wilhelmina’s collections in a Rococo-inspired interior.",
    alt: "Carved wooden panelling, red seating and a tapestry in the Hallwyl Museum’s Ladies’ Drawing Room",
    source: "the-ladies-drawing-room",
  },
] as const;
