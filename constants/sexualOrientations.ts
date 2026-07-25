export const sexualOrientations = [
  "Straight",
  "Gay",
  "Lesbian",
  "Bisexual",
  "Pansexual",
  "Asexual",
  "Demisexual",
  "Queer",
  "Questioning",
  "Sapiosexual",
  "Polysexual",
  "Omnisexual",
  "Androsexual",
  "Gynesexual",
  "Graysexual",
  "Heteroflexible",
  "Homoflexible",
  "Aromantic",
  "Fluid",
  "Prefer not to say",
];

export const sexualOrientationOptions = sexualOrientations.map(
  (orientation) => ({
    label: orientation,
    value: orientation,
  }),
);
