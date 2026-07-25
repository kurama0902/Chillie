import { MockUser } from "@/types/types";

const portrait = (n: number) => `https://i.pravatar.cc/1000?img=${n}`;

const baseUsers: Omit<MockUser, "id">[] = [
  {
    name: "Jessica",
    lastname: "Parker",
    age: "23",
    job: "Professional model",
    image_url: portrait(49),
    additionalProfileImageUrls: [portrait(45), portrait(44), portrait(41)],
    description:
      "My name is Jessica Parker and I enjoy meeting new people and finding ways to help them have an uplifting experience. Coffee first, conversation later — I love long walks along the canals, spontaneous weekend trips, and cooking for friends. Looking for someone genuine who can make me laugh and isn't afraid of deep conversations.",
    city: "Amsterdam",
    distance: "1 km",
    hobbies: ["Photography", "Yoga", "Travel"],
  },
  {
    name: "Camila",
    lastname: "Snow",
    age: "23",
    job: "Interior designer",
    image_url: portrait(47),
    additionalProfileImageUrls: [portrait(31), portrait(9)],
    description:
      "Plant mom, weekend hiker, and an incurable foodie. I spend my days turning empty rooms into cozy homes and my weekends chasing sunsets on the trail. I believe the best conversations happen over a shared meal, so if you know a hidden gem of a restaurant, I'm already interested. Looking for someone curious and kind.",
    city: "Rotterdam",
    distance: "3 km",
    hobbies: ["Hiking", "Cooking", "Design"],
  },
  {
    name: "Bred",
    lastname: "Jackson",
    age: "25",
    job: "Photographer",
    image_url: portrait(12),
    additionalProfileImageUrls: [portrait(13), portrait(15), portrait(18)],
    description: "Chasing golden hours and good playlists.",
    city: "Utrecht",
    distance: "5 km",
    hobbies: ["Photography", "Music", "Cycling"],
  },
  {
    name: "Sophia",
    lastname: "Bennett",
    age: "27",
    job: "Software engineer",
    image_url: portrait(20),
    additionalProfileImageUrls: [portrait(21), portrait(24)],
    description: "I build apps by day and climb walls by night.",
    city: "Eindhoven",
    distance: "8 km",
    hobbies: ["Climbing", "Coding", "Board games"],
  },
  {
    name: "Daniel",
    lastname: "Morgan",
    age: "29",
    job: "Chef",
    image_url: portrait(33),
    additionalProfileImageUrls: [portrait(52), portrait(53), portrait(54)],
    description: "I'll cook, you bring the wine. Deal?",
    city: "The Hague",
    distance: "10 km",
    hobbies: ["Cooking", "Wine tasting", "Running"],
  },
  {
    name: "Olivia",
    lastname: "Reed",
    age: "24",
    job: "Nurse",
    image_url: portrait(16),
    additionalProfileImageUrls: [portrait(26), portrait(29)],
    description: "Kind heart, big dreams, and a weakness for dogs.",
    city: "Groningen",
    distance: "12 km",
    hobbies: ["Volunteering", "Painting", "Dogs"],
  },
  {
    name: "Lucas",
    lastname: "Hayes",
    age: "31",
    job: "Architect",
    image_url: portrait(51),
    additionalProfileImageUrls: [portrait(56), portrait(57)],
    description: "Minimalist by trade, romantic at heart.",
    city: "Haarlem",
    distance: "15 km",
    hobbies: ["Sketching", "Sailing", "Coffee"],
  },
  {
    name: "Mia",
    lastname: "Clarke",
    age: "26",
    job: "Journalist",
    image_url: portrait(5),
    additionalProfileImageUrls: [portrait(1), portrait(10), portrait(23)],
    description: "Always curious. Ask me about my last road trip.",
    city: "Delft",
    distance: "18 km",
    hobbies: ["Writing", "Travel", "Vinyl records"],
  },
  {
    name: "Ethan",
    lastname: "Walker",
    age: "28",
    job: "Personal trainer",
    image_url: portrait(59),
    additionalProfileImageUrls: [portrait(60), portrait(61), portrait(63)],
    description: "Gym in the morning, tacos at night. Balance is key.",
    city: "Leiden",
    distance: "21 km",
    hobbies: ["Fitness", "Surfing", "Cooking"],
  },
  {
    name: "Ava",
    lastname: "Turner",
    age: "22",
    job: "Art student",
    image_url: portrait(48),
    additionalProfileImageUrls: [portrait(43), portrait(32)],
    description: "Museums, matcha, and midnight sketching sessions.",
    city: "Maastricht",
    distance: "25 km",
    hobbies: ["Drawing", "Museums", "Ceramics"],
  },
];

const randomUUID = () =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });

export const mockUsers: MockUser[] = baseUsers.map((user) => ({
  ...user,
  id: randomUUID(),
}));
