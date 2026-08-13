import { useLocalSearchParams } from 'expo-router';
import { AskForm } from '@/components/AskForm';

export default function AskModalScreen() {
  const { placeId, placeName } = useLocalSearchParams<{ placeId?: string; placeName?: string }>();
  return <AskForm placeId={placeId} placeName={placeName} />;
}
