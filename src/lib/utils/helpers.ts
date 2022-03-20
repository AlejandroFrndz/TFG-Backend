type CharacterType = "a" | "A" | "#" | "!";
/**
 *
 * @param {number} length Desired length of the generated string
 * @param {CharacterType[]} chars Kind of characters that will be included in the generated string.
 *
 * a - Lower case letters
 *
 * A - Upper case letters
 *
 * \# - Numbers
 *
 * ! - Special characters (~ ` ! @ # $ % ^ & * ( ) _ + - = { } [ ] : \" ; ' < > ? , . / | \\)
 * @returns A string of the desired length that includes characters of the selected type(s)
 */
export function randomAlphaNumericString(
    length: number,
    ...chars: CharacterType[]
): string {
    let mask = "";
    if (chars.indexOf("a") > -1) mask += "abcdefghijklmnopqrstuvwxyz";
    if (chars.indexOf("A") > -1) mask += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    if (chars.indexOf("#") > -1) mask += "0123456789";
    if (chars.indexOf("!") > -1) mask += "~`!@#$%^&*()_+-={}[]:\";'<>?,./|\\";
    let result = "";
    for (let i = length; i > 0; --i)
        result += mask[Math.floor(Math.random() * mask.length)];
    return result;
}
