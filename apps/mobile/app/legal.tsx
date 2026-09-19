import { ScrollView, Text } from 'react-native';
import { BRAND, legalDisplayName, traderIdentityLines, isVatRegistered, vatNumberDisplay } from '@motive-fashion/config';

export default function Legal() {
  const vat = vatNumberDisplay();
  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 24 }}>Business details</Text>
      {traderIdentityLines().map((line) => (
        <Text key={line}>{line}</Text>
      ))}
      <Text>
        {isVatRegistered() && vat
          ? `VAT ${vat}`
          : 'Not VAT-registered. Prices are in euro, not advertised as VAT-inclusive.'}
      </Text>
      <Text style={{ fontSize: 20, marginTop: 12 }}>Returns</Text>
      <Text>
        You have {BRAND.returnDays} days from delivery or collection to withdraw. Items must be unworn, unwashed, and with
        tags attached.
      </Text>
      <Text>
        Change of mind after dispatch: we refund the goods; you pay return postage. Cancel before we ship: full refund.
        Faulty goods: we cover the return.
      </Text>
      <Text>
        Email {BRAND.supportEmail} with your order reference, or find the order in the app if you are signed in. Seller:{' '}
        {legalDisplayName()}, sole trader, {BRAND.city}.
      </Text>
    </ScrollView>
  );
}
