import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

export default function Home() {
  return (
    <View style={{ padding: 24, gap: 16 }}>
      <Text style={{ fontSize: 32, fontFamily: 'Georgia' }}>Quiet luxury, Dublin.</Text>
      <Link href="/shop" asChild>
        <Pressable style={{ backgroundColor: '#1c1917', padding: 14, borderRadius: 999 }}>
          <Text style={{ color: '#f5f0e8', textAlign: 'center' }}>Shop</Text>
        </Pressable>
      </Link>
      <Link href="/cart">
        <Text>Cart</Text>
      </Link>
      <Link href="/login">
        <Text>Login</Text>
      </Link>
      <Link href="/wishlist">
        <Text>Wishlist</Text>
      </Link>
      <Link href="/orders">
        <Text>Orders</Text>
      </Link>
      <Link href="/notifications">
        <Text>Notifications</Text>
      </Link>
      <Link href="/profile">
        <Text>Profile</Text>
      </Link>
    </View>
  );
}
