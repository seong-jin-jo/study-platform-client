import { permanentRedirect } from 'next/navigation';

export default function NotificationFallbackRedirect() {
  permanentRedirect('/notification');
}
