/**
 * Quick test to verify formatters work correctly
 * Run with: npx ts-node -r tsconfig-paths/register src/lib/formatters/__tests__/formatters.test.ts
 */

import {
  formatPrice,
  formatPriceRange,
  formatEventDate,
  formatDateRange,
  formatWeekday,
  truncate,
  slugify,
  pluralize,
} from '../index'

console.log('🧪 Testing Formatters...\n')

// Price formatters
console.log('💰 Price Formatters:')
console.log('formatPrice(29900):', formatPrice(29900)) // Should be "299,-"
console.log('formatPrice(0):', formatPrice(0)) // Should be "Free"
console.log('formatPrice(null):', formatPrice(null)) // Should be "Free"
console.log('formatPriceRange(29900, 39900):', formatPriceRange(29900, 39900)) // Should be "299,- - 399,-"
console.log('')

// Date formatters
console.log('📅 Date Formatters:')
const testDate = new Date('2025-01-25T19:00:00')
console.log('formatEventDate:', formatEventDate(testDate)) // Should be in Norwegian
console.log('formatDateRange:', formatDateRange(new Date('2025-01-20'), new Date('2025-03-15')))
console.log('formatWeekday(1):', formatWeekday(1)) // Should be "mandag"
console.log('formatWeekday(5):', formatWeekday(5)) // Should be "fredag"
console.log('')

// Text formatters
console.log('✏️  Text Formatters:')
console.log('truncate("This is a long text", 10):', truncate("This is a long text", 10)) // Should be "This is a..."
console.log('slugify("Hello World!"):', slugify("Hello World!")) // Should be "hello-world"
console.log('slugify("Øystein\'s Café"):', slugify("Øystein's Café")) // Should be "oysteins-cafe"
console.log('pluralize(1, "ticket"):', pluralize(1, "ticket")) // Should be "1 ticket"
console.log('pluralize(5, "ticket"):', pluralize(5, "ticket")) // Should be "5 tickets"
console.log('')

console.log('✅ All formatters executed successfully!')
console.log('📝 Manual verification: Check output above matches expected values')
