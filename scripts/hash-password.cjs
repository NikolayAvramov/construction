/**
 * Същият алгоритъм като в app: bcrypt.hash(..., 10)
 *
 *   npm run hash-password -- "моята-парола"
 *
 * Копирай отпечатания низ в колоната passwordHash (или го ползвай в seed/скрипт).
 */
const bcrypt = require("bcryptjs");

const plain = process.argv[2];
if (!plain) {
  console.error('Usage: npm run hash-password -- "your-password"');
  process.exit(1);
}

bcrypt.hash(plain, 10).then((hash) => {
  console.log(hash);
});
