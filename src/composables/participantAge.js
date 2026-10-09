import dayjs from 'dayjs'

// Ages a participant may have when entered, by the form or by CSV import.
// The floor is Safe Environment policy: it was 8 until 7.1.33, lowered to 4 so
// father-son clubs can record the younger boys. It also catches a mistyped
// birth year, which would otherwise make a boy look like a baby.
export const PARTICIPANT_MIN_AGE = 4
export const PARTICIPANT_MAX_AGE = 18

// Returns '' when the birthdate is acceptable, otherwise the reason to show.
export function participantAgeError(dob) {
  const d = dayjs(dob)
  if (!dob || !d.isValid()) {
    return 'No valid'
  }
  const age = dayjs().diff(d, 'y')
  if (age < PARTICIPANT_MIN_AGE) {
    return 'Too young'
  }
  if (age > PARTICIPANT_MAX_AGE) {
    return 'Too old'
  }
  return ''
}
