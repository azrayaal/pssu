import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router-dom';
import { Home, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';

export function RouteErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();

  const status = isRouteErrorResponse(error) ? error.status : 500;
  const message = isRouteErrorResponse(error)
    ? error.statusText
    : error instanceof Error
      ? error.message
      : 'Terjadi kesalahan yang tidak terduga.';

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-6">
      <Panel className="w-full max-w-lg">
        <div className="px-6 py-8 text-center">
          <p className="tabular text-4xl font-semibold text-brand-700">{status}</p>
          <h1 className="mt-3 text-lg font-semibold text-ink-900">
            {status === 404 ? 'Halaman tidak ditemukan' : 'Halaman gagal dimuat'}
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-ink-500">{message}</p>
          <div className="mt-5 flex items-center justify-center gap-2">
            <Button variant="outline" leadingIcon={<RefreshCw className="size-4" />} onClick={() => window.location.reload()}>
              Muat ulang
            </Button>
            <Button variant="primary" leadingIcon={<Home className="size-4" />} onClick={() => navigate('/')}>
              Kembali ke dashboard
            </Button>
          </div>
        </div>
      </Panel>
    </div>
  );
}
