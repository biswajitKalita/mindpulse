import { Skeleton, SkeletonText, SkeletonCard, SkeletonCircle } from './Skeleton';

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen grid-bg py-8 page-px" style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Skeleton width={180} height={12} borderRadius={6} />
        <Skeleton width={280} height={32} borderRadius={8} style={{ marginTop: 8 }} />
        <Skeleton width={200} height={14} borderRadius={6} style={{ marginTop: 8 }} />
      </div>

      {/* Main grid */}
      <div className="grid-2-1" style={{ marginBottom: 16 }}>
        {/* Risk card */}
        <SkeletonCard>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <Skeleton width={200} height={18} borderRadius={6} />
              <Skeleton width={160} height={12} borderRadius={6} style={{ marginTop: 6 }} />
            </div>
            <Skeleton width={80} height={22} borderRadius={99} />
          </div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 8 }}>
            <SkeletonCircle size={150} />
            <div style={{ flex: 1, minWidth: 150, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Skeleton height={60} borderRadius={14} />
              <div style={{ display: 'flex', gap: 8 }}>
                <Skeleton height={36} borderRadius={11} />
                <Skeleton height={36} borderRadius={11} />
              </div>
            </div>
          </div>
        </SkeletonCard>

        {/* Right panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <SkeletonCard padding={20}>
            <Skeleton width={130} height={16} borderRadius={6} />
            {[1, 2, 3].map(i => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Skeleton width={60} height={12} />
                  <Skeleton width={30} height={12} />
                </div>
                <Skeleton height={4} borderRadius={99} />
              </div>
            ))}
          </SkeletonCard>
          <div className="glass" style={{ borderRadius: 20, padding: 18, textAlign: 'center' }}>
            <SkeletonCircle size={32} style={{ margin: '0 auto 8px' }} />
            <Skeleton width={120} height={16} borderRadius={6} style={{ margin: '0 auto 6px' }} />
            <Skeleton width={160} height={12} borderRadius={6} style={{ margin: '0 auto 10px' }} />
            <Skeleton height={36} borderRadius={11} />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-4-cols" style={{ marginBottom: 16 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="glass" style={{ borderRadius: 18, padding: '16px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <SkeletonCircle size={34} />
              <Skeleton width={40} height={14} borderRadius={6} />
            </div>
            <Skeleton width={50} height={22} borderRadius={6} />
            <Skeleton width={70} height={12} borderRadius={6} style={{ marginTop: 4 }} />
          </div>
        ))}
      </div>

      {/* Weekly chart */}
      <SkeletonCard>
        <Skeleton width={140} height={18} borderRadius={6} />
        <Skeleton width={200} height={12} borderRadius={6} />
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: 130, gap: 6, marginTop: 8 }}>
          {[1, 2, 3, 4, 5, 6, 7].map(i => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
              <div style={{ flex: 1, width: '100%', borderRadius: '5px 5px 0 0', background: 'rgba(255,255,255,0.04)' }} />
              <Skeleton width={20} height={10} borderRadius={4} />
            </div>
          ))}
        </div>
      </SkeletonCard>
    </div>
  );
}

export function HistorySkeleton() {
  return (
    <div className="min-h-screen grid-bg py-10 px-4" style={{ maxWidth: '56rem', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <Skeleton width={100} height={12} borderRadius={6} />
        <Skeleton width={220} height={32} borderRadius={8} style={{ marginTop: 8 }} />
        <Skeleton width={320} height={14} borderRadius={6} style={{ marginTop: 8 }} />
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 24 }}>
        {[1, 2, 3].map(i => (
          <div key={i} className="glass rounded-2xl p-5 text-center">
            <Skeleton width={40} height={28} borderRadius={8} style={{ margin: '0 auto 6px' }} />
            <Skeleton width={80} height={12} borderRadius={6} style={{ margin: '0 auto' }} />
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="glass rounded-2xl p-4 mb-6" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Skeleton height={40} borderRadius={10} style={{ flex: 1, minWidth: 200 }} />
        <Skeleton width={150} height={40} borderRadius={10} />
      </div>

      {/* Entry cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[1, 2, 3].map(i => (
          <div key={i} className="glass rounded-3xl p-6" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <SkeletonCircle size={44} />
                <div>
                  <Skeleton width={180} height={14} borderRadius={6} />
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    <Skeleton width={60} height={18} borderRadius={99} />
                    <Skeleton width={70} height={18} borderRadius={99} />
                  </div>
                </div>
              </div>
              <Skeleton width={50} height={36} borderRadius={8} />
            </div>
            <SkeletonText lines={2} maxWidth="90%" height={13} />
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[1, 2, 3].map(j => (
                <Skeleton key={j} width={50 + j * 10} height={22} borderRadius={99} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ResourcesSkeleton() {
  return (
    <div className="min-h-screen grid-bg py-10 px-4" style={{ maxWidth: '80rem', margin: '0 auto' }}>
      {/* Header */}
      <div className="text-center mb-12">
        <Skeleton width={180} height={14} borderRadius={6} style={{ margin: '0 auto 12px' }} />
        <Skeleton width={260} height={40} borderRadius={8} style={{ margin: '0 auto 8px' }} />
        <Skeleton width={340} height={16} borderRadius={6} style={{ margin: '0 auto' }} />
      </div>

      {/* Crisis card */}
      <div className="crisis-card rounded-3xl p-8 mb-10" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <SkeletonCircle size={48} />
          <div>
            <Skeleton width={220} height={22} borderRadius={8} />
            <Skeleton width={280} height={14} borderRadius={6} style={{ marginTop: 6 }} />
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} style={{ padding: 20, borderRadius: 16, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
              <Skeleton width={140} height={14} borderRadius={6} />
              <Skeleton width={100} height={24} borderRadius={6} style={{ marginTop: 8 }} />
              <Skeleton width={160} height={12} borderRadius={6} style={{ marginTop: 6 }} />
            </div>
          ))}
        </div>
        <Skeleton height={44} borderRadius={14} />
      </div>

      {/* Activities */}
      <div style={{ marginBottom: 10 }}>
        <Skeleton width={220} height={28} borderRadius={8} style={{ marginBottom: 20 }} />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="glass rounded-3xl p-6" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <SkeletonCircle size={48} />
                <Skeleton width={50} height={22} borderRadius={99} />
              </div>
              <Skeleton width="70%" height={18} borderRadius={6} />
              <SkeletonText lines={2} maxWidth="95%" height={13} />
              <Skeleton width={100} height={14} borderRadius={6} />
            </div>
          ))}
        </div>
      </div>

      {/* Articles + Videos */}
      <div className="grid lg:grid-cols-2 gap-6 mb-10">
        {[1, 2].map(i => (
          <div key={i} className="glass rounded-3xl p-8" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <SkeletonCircle size={40} />
              <Skeleton width={160} height={22} borderRadius={8} />
            </div>
            {[1, 2, 3, 4].map(j => (
              <div key={j} style={{ padding: 16, borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Skeleton width="70%" height={14} borderRadius={6} />
                  <Skeleton width={40} height={12} borderRadius={6} />
                </div>
                <Skeleton width={70} height={18} borderRadius={99} />
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="rounded-3xl p-10 text-center" style={{ background: 'linear-gradient(135deg, rgba(0,229,255,0.08), rgba(0,229,255,0.12))', border: '1px solid rgba(0,229,255,0.15)' }}>
        <Skeleton width={220} height={28} borderRadius={8} style={{ margin: '0 auto 12px' }} />
        <SkeletonText lines={2} maxWidth={400} height={14} gap={8} />
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 20 }}>
          <Skeleton width={140} height={44} borderRadius={16} />
          <Skeleton width={120} height={44} borderRadius={16} />
        </div>
      </div>
    </div>
  );
}
