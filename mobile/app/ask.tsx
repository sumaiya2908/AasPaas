import { useLocalSearchParams } from 'expo-router';
import { AskForm } from '@/components/AskForm';

export default function AskModalScreen() {
  const { placeId, placeName, q } = useLocalSearchParams<{
    placeId?: string;
    placeName?: string;
    q?: string;
  }>();
  return <AskForm placeId={placeId} placeName={placeName} prefill={q} />;
}
