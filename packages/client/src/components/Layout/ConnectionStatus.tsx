import { useTranslation } from 'react-i18next';

interface ConnectionStatusProps {
  status: 'connected' | 'connecting' | 'disconnected';
}

export function ConnectionStatus({ status }: ConnectionStatusProps) {
  const { t } = useTranslation();
  if (status === 'connected') return null;

  return (
    <div className={`fixed bottom-4 left-4 z-50 px-4 py-2 rounded-lg text-white text-sm ${
      status === 'connecting' ? 'bg-yellow-600' : 'bg-red-600'
    }`}>
      {status === 'connecting' ? t('status.reconnecting') : t('status.disconnected')}
    </div>
  );
}
