// R-11 航线信息：区域 + 扫描方式标签 + 示教备注
import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { api } from '../api';
import { Button, CtaRow } from '../components/Button';
import { Dialog } from '../components/BottomSheet';
import { SubHeader } from '../components/SubHeader';
import { SCAN_TAGS } from '../mock/routes';

export function RouteEdit({ routeId }: { routeId: string }) {
  const routes = useStore(s => s.routes);
  const set = useStore(s => s.set);
  const showToast = useStore(s => s.showToast);
  const route = routes.find(r => r.id === routeId);
  const [name, setName] = useState(route?.name ?? '');
  const [tags, setTags] = useState<string[]>(route?.scanTags ?? []);
  const [note, setNote] = useState(route?.note ?? '');
  const [discardOpen, setDiscardOpen] = useState(false);

  const dirty = name !== (route?.name ?? '')
    || note !== (route?.note ?? '')
    || JSON.stringify(tags) !== JSON.stringify(route?.scanTags ?? []);

  useEffect(() => {
    const onBack = () => {
      if (dirty) setDiscardOpen(true);
      else set({ routeSub: null });
    };
    window.addEventListener('routeedit-back', onBack);
    return () => window.removeEventListener('routeedit-back', onBack);
  }, [dirty, set]);

  if (!route) return null;

  const save = async () => {
    if (!name.trim()) return;
    await api.updateRoute(route.id, { name: name.trim(), note: note.trim(), scanTags: tags });
    const { routes: rs } = await api.getRoutes();
    set({ routes: rs, routeSub: null });
    showToast('已保存');
  };

  const toggleTag = (t: string) => {
    setTags(v => v.includes(t) ? v.filter(x => x !== t) : [...v, t]);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', borderRadius: 12, padding: '11px 14px',
    background: 'var(--surface-3)', border: '1.5px solid transparent',
    color: 'var(--text-primary)', fontSize: 13.5, outline: 'none', resize: 'none',
    transition: 'border-color .15s, background .15s',
  };
  const focus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = 'var(--brand)';
    e.target.style.background = 'var(--surface-1)';
  };
  const blur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = 'transparent';
    e.target.style.background = 'var(--surface-3)';
  };

  const tryBack = () => {
    if (dirty) setDiscardOpen(true);
    else set({ routeSub: null });
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      <SubHeader title="编辑航线名称" onBack={tryBack} />
      <div className="flex-1 overflow-y-auto" style={{ padding: 16 }}>
        <div className="dlabel mb-1.5" style={{ fontSize: 11 }}>区域</div>
        <input
          style={{ ...inputStyle, height: 44 }}
          maxLength={24}
          placeholder="如：A区、B区码垛区"
          value={name}
          onChange={e => setName(e.target.value)}
          onFocus={focus} onBlur={blur}
        />

        <div className="dlabel mt-5 mb-2" style={{ fontSize: 11 }}>扫描方式</div>
        <div className="flex flex-wrap gap-2">
          {SCAN_TAGS.map(t => {
            const on = tags.includes(t);
            return (
              <button
                key={t}
                style={{
                  fontSize: 12.5, padding: '7px 14px', borderRadius: 999,
                  background: on ? 'var(--brand)' : 'var(--surface-1)',
                  border: `1px solid ${on ? 'var(--brand)' : 'var(--border-default)'}`,
                  color: on ? '#FFFFFF' : 'var(--text-secondary)',
                  cursor: 'pointer', transition: 'all .12s',
                }}
                onClick={() => toggleTag(t)}
              >
                {t}
              </button>
            );
          })}
        </div>

        <div className="dlabel mt-5 mb-1.5" style={{ fontSize: 11 }}>示教备注</div>
        <textarea
          style={{ ...inputStyle, height: 108, lineHeight: 1.6 }}
          maxLength={200}
          placeholder="覆盖哪些堆位？哪里有立柱或低矮结构？什么情况下不适用？"
          value={note}
          onChange={e => setNote(e.target.value)}
          onFocus={focus} onBlur={blur}
        />

        <div className="mt-6 mb-2">
          <CtaRow>
            <Button disabled={!name.trim()} onClick={save}>保存</Button>
          </CtaRow>
        </div>
      </div>

      <Dialog
        open={discardOpen}
        title="放弃修改？"
        body="未保存的修改将会丢失"
        actions={[
          { label: '继续编辑', onClick: () => setDiscardOpen(false) },
          { label: '放弃', tone: 'danger', onClick: () => { setDiscardOpen(false); set({ routeSub: null }); } },
        ]}
      />
    </div>
  );
}
