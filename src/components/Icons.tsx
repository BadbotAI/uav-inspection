// 统一图标库：全部 SVG 描边风格，禁用 emoji
const S = (props: { size?: number }) => ({
  width: props.size ?? 15, height: props.size ?? 15,
  viewBox: '0 0 16 16', fill: 'none' as const,
  stroke: 'currentColor', strokeWidth: 1.3,
  strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
});

// 从遥控器同步：双弧更新图标
export const IconSync = ({ size, spinning }: { size?: number; spinning?: boolean }) => (
  <svg {...S({ size })} style={spinning ? { animation: 'spin .9s linear infinite' } : undefined}>
    <path d="M13.2 6.4A5.4 5.4 0 0 0 3.6 4.9" />
    <path d="M3.4 2.2v2.9h2.9" />
    <path d="M2.8 9.6a5.4 5.4 0 0 0 9.6 1.5" />
    <path d="M12.6 13.8v-2.9H9.7" />
  </svg>
);

export const IconSearch = ({ size }: { size?: number }) => (
  <svg {...S({ size })}>
    <circle cx="7" cy="7" r="4.6" />
    <path d="M10.6 10.6 L14 14" />
  </svg>
);

export const IconExpand = ({ size }: { size?: number }) => (
  <svg {...S({ size })}>
    <path d="M9.6 2.4h4v4M14 2.4 9.2 7.2M6.4 13.6h-4v-4M2 13.6 6.8 8.8" />
  </svg>
);

export const IconCompress = ({ size }: { size?: number }) => (
  <svg {...S({ size })}>
    <path d="M13.6 6.4h-4v-4M9.6 6.4 14 2M2.4 9.6h4v4M6.4 9.6 2 14" />
  </svg>
);

export const IconEdit = ({ size }: { size?: number }) => (
  <svg {...S({ size })}>
    <path d="M11.2 2.4 L13.6 4.8 L6 12.4 L3 13 L3.6 10 Z" />
  </svg>
);

export const IconTrash = ({ size }: { size?: number }) => (
  <svg {...S({ size })}>
    <path d="M2.5 4.3h11M6.3 4.3V2.8h3.4v1.5M4 4.3l.7 9h6.6l.7-9M6.6 7v4M9.4 7v4" />
  </svg>
);

export const IconMore = ({ size }: { size?: number }) => (
  <svg {...S({ size })}>
    <circle cx="3.2" cy="8" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="8" cy="8" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="12.8" cy="8" r="1.1" fill="currentColor" stroke="none" />
  </svg>
);

export const IconChevronRight = ({ size }: { size?: number }) => (
  <svg {...S({ size })}><path d="M5.8 3 L11 8 L5.8 13" /></svg>
);

export const IconChevronLeft = ({ size }: { size?: number }) => (
  <svg {...S({ size })}><path d="M10.2 3 L5 8 L10.2 13" /></svg>
);

export const IconChevronDown = ({ size }: { size?: number }) => (
  <svg {...S({ size })}><path d="M3 5.8 L8 11 L13 5.8" /></svg>
);

export const IconPlus = ({ size }: { size?: number }) => (
  <svg {...S({ size })}><path d="M8 2.8v10.4M2.8 8h10.4" /></svg>
);

export const IconRoute = ({ size }: { size?: number }) => (
  <svg {...S({ size })}>
    <path d="M3.6 12.6 C 8 12.6, 4.4 6.8, 8 5.6 C 10.8 4.7, 10.8 3.8, 12 3.4" strokeDasharray="2.2 1.7" />
    <circle cx="3.6" cy="12.6" r="1.5" />
    <rect x="10.6" y="1.8" width="3.2" height="3.2" rx="0.9" />
  </svg>
);

export const IconDrone = ({ size }: { size?: number }) => (
  <svg {...S({ size })}>
    <rect x="5.4" y="5.4" width="5.2" height="5.2" rx="1.2" />
    <path d="M2.6 2.6 L5.4 5.4 M13.4 2.6 L10.6 5.4 M2.6 13.4 L5.4 10.6 M13.4 13.4 L10.6 10.6" />
    <circle cx="2.6" cy="2.6" r="1.1" /><circle cx="13.4" cy="2.6" r="1.1" />
    <circle cx="2.6" cy="13.4" r="1.1" /><circle cx="13.4" cy="13.4" r="1.1" />
  </svg>
);

export const IconRemote = ({ size }: { size?: number }) => (
  <svg {...S({ size })}>
    <rect x="3.2" y="5.2" width="9.6" height="7.6" rx="1.6" />
    <path d="M5.4 5.2 V2.8 M10.6 5.2 V2.8" />
    <circle cx="5.8" cy="9" r="1.2" /><circle cx="10.2" cy="9" r="1.2" />
  </svg>
);

export const IconDoc = ({ size }: { size?: number }) => (
  <svg {...S({ size })}>
    <path d="M4 1.8h5.4L12.6 5v9.2H4Z M9.2 1.8V5h3.4" />
    <path d="M6 8h4.6M6 10.6h4.6" />
  </svg>
);

export const IconCopy = ({ size }: { size?: number }) => (
  <svg {...S({ size })}>
    <rect x="5.6" y="5.6" width="8" height="8" rx="1.2" />
    <path d="M10.4 5.6V3.6a1.2 1.2 0 0 0-1.2-1.2H3.6A1.2 1.2 0 0 0 2.4 3.6v5.6a1.2 1.2 0 0 0 1.2 1.2h2" />
  </svg>
);

export const IconDownload = ({ size }: { size?: number }) => (
  <svg {...S({ size })}>
    <path d="M8 2.4v7.4M4.8 6.8 8 10 11.2 6.8M2.8 12.8h10.4" />
  </svg>
);

export const IconNote = ({ size }: { size?: number }) => (
  <svg {...S({ size })}>
    <path d="M2.8 3.4h10.4v7.4H8.6L5.4 13.6v-2.8H2.8Z" />
  </svg>
);

// 切换设备：双向箭头
export const IconSwitch = ({ size }: { size?: number }) => (
  <svg {...S({ size })}>
    <path d="M2.6 5.2h9.4M9.4 2.6 12.4 5.2 9.4 7.8" />
    <path d="M13.4 10.8H4M6.6 8.2 3.6 10.8 6.6 13.4" />
  </svg>
);

// 电量
export const IconBattery = ({ size }: { size?: number }) => (
  <svg {...S({ size })}>
    <rect x="1.6" y="4.6" width="11" height="6.8" rx="1.6" />
    <path d="M14.4 6.8v2.4" strokeWidth="1.8" />
    <rect x="3.4" y="6.3" width="4.6" height="3.4" rx="0.7" fill="currentColor" stroke="none" />
  </svg>
);

// 状态（盾形+勾）
export const IconShield = ({ size }: { size?: number }) => (
  <svg {...S({ size })}>
    <path d="M8 1.8 L13.2 3.8 V8 C13.2 11.2 10.9 13.3 8 14.2 C5.1 13.3 2.8 11.2 2.8 8 V3.8 Z" strokeLinejoin="round" />
    <path d="M5.6 8 L7.4 9.8 L10.6 6.3" />
  </svg>
);

// 存储（数据柱）
export const IconStorage = ({ size }: { size?: number }) => (
  <svg {...S({ size })}>
    <ellipse cx="8" cy="3.8" rx="5.4" ry="2" />
    <path d="M2.6 3.8v8.4c0 1.1 2.4 2 5.4 2s5.4-.9 5.4-2V3.8" />
    <path d="M2.6 8c0 1.1 2.4 2 5.4 2s5.4-.9 5.4-2" />
  </svg>
);

// 图层（堆叠菱形）
export const IconLayers = ({ size }: { size?: number }) => (
  <svg {...S({ size })}>
    <path d="M8 2.2 L14 5.4 L8 8.6 L2 5.4 Z" strokeLinejoin="round" />
    <path d="M2.6 8.6 L8 11.5 L13.4 8.6" strokeLinejoin="round" />
    <path d="M2.6 11.4 L8 14.3 L13.4 11.4" strokeLinejoin="round" />
  </svg>
);

// 地图（折叠图）
export const IconMap = ({ size }: { size?: number }) => (
  <svg {...S({ size })}>
    <path d="M2.2 4.4 L6.1 2.9 L9.9 4.4 L13.8 2.9 V11.6 L9.9 13.1 L6.1 11.6 L2.2 13.1 Z" strokeLinejoin="round" />
    <path d="M6.1 2.9 V11.6 M9.9 4.4 V13.1" />
  </svg>
);

export const IconPin = ({ size }: { size?: number }) => (
  <svg {...S({ size })}>
    <path d="M8 14.2 C 8 14.2, 12.6 9.6, 12.6 6.4 A 4.6 4.6 0 1 0 3.4 6.4 C 3.4 9.6, 8 14.2, 8 14.2 Z" />
    <circle cx="8" cy="6.4" r="1.7" />
  </svg>
);

// 导入文件：下载入托盘
export const IconImport = ({ size }: { size?: number }) => (
  <svg {...S({ size })}>
    <path d="M8 1.8v7M5.2 6 8 8.8 10.8 6" />
    <path d="M2.4 9.6v3a1.2 1.2 0 0 0 1.2 1.2h8.8a1.2 1.2 0 0 0 1.2-1.2v-3" />
  </svg>
);

export const IconGear = ({ size }: { size?: number }) => (
  <svg {...S({ size })}>
    <circle cx="8" cy="8" r="2.2" />
    <path d="M8 1.6v2M8 12.4v2M1.6 8h2M12.4 8h2M3.5 3.5l1.4 1.4M11.1 11.1l1.4 1.4M12.5 3.5l-1.4 1.4M4.9 11.1l-1.4 1.4" />
  </svg>
);

export const IconWifi = ({ size }: { size?: number }) => (
  <svg {...S({ size })}>
    <path d="M2.2 6.2a8.2 8.2 0 0 1 11.6 0M4.4 8.6a5 5 0 0 1 7.2 0M6.6 11a2 2 0 0 1 2.8 0" />
    <circle cx="8" cy="13" r="0.9" fill="currentColor" stroke="none" />
  </svg>
);

// 横屏：横向机身 + 顺时针旋转弧
export const IconRotate = ({ size }: { size?: number }) => (
  <svg {...S({ size })}>
    <rect x="1.8" y="5.2" width="9.6" height="6.2" rx="1.4" />
    <path d="M13.4 9.4V6.6a2 2 0 0 0-2-2h-.6" />
    <path d="M12.1 3.3 10.8 4.6l1.3 1.3" />
  </svg>
);

// 竖屏：纵向机身 + 逆时针旋转弧
export const IconPortrait = ({ size }: { size?: number }) => (
  <svg {...S({ size })}>
    <rect x="5.2" y="1.8" width="6.2" height="9.6" rx="1.4" />
    <path d="M9.4 13.4H6.6a2 2 0 0 1-2-2v-.6" />
    <path d="M3.3 12.1 4.6 10.8l1.3 1.3" />
  </svg>
);

// 退出：门框 + 向外箭头
export const IconLogout = ({ size }: { size?: number }) => (
  <svg {...S({ size })}>
    <path d="M6.4 2.2H3.4a1.2 1.2 0 0 0-1.2 1.2v9.2a1.2 1.2 0 0 0 1.2 1.2h3" />
    <path d="M10 5.2 12.8 8 10 10.8M6.2 8h6.6" />
  </svg>
);

// 滑杆设置：三条轨道 + 滑钮
export const IconSliders = ({ size }: { size?: number }) => (
  <svg width={size ?? 16} height={size ?? 16} viewBox="0 0 16 16" fill="none"
    stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
    <path d="M2.2 4.4h11.6M2.2 8h11.6M2.2 11.6h11.6" />
    <circle cx="6" cy="4.4" r="1.5" fill="var(--surface-1, #FFF)" />
    <circle cx="10.4" cy="8" r="1.5" fill="var(--surface-1, #FFF)" />
    <circle cx="4.6" cy="11.6" r="1.5" fill="var(--surface-1, #FFF)" />
  </svg>
);

// 拍照：相机机身 + 镜头
export const IconCamera = ({ size }: { size?: number }) => (
  <svg width={size ?? 16} height={size ?? 16} viewBox="0 0 16 16" fill="none"
    stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.2 5.4a1.2 1.2 0 0 1 1.2-1.2h1.9l1-1.4h3.4l1 1.4h1.9a1.2 1.2 0 0 1 1.2 1.2v6.2a1.2 1.2 0 0 1-1.2 1.2H3.4a1.2 1.2 0 0 1-1.2-1.2Z" />
    <circle cx="8" cy="8.2" r="2.4" />
  </svg>
);

// 拍照（实色）：填充机身 + 镂空镜头
export const IconCameraFill = ({ size }: { size?: number }) => (
  <svg width={size ?? 16} height={size ?? 16} viewBox="0 0 16 16" fill="none">
    <path
      d="M2 5.4a1.4 1.4 0 0 1 1.4-1.4h1.8l1-1.4h3.6l1 1.4h1.8A1.4 1.4 0 0 1 14 5.4v6.2a1.4 1.4 0 0 1-1.4 1.4H3.4A1.4 1.4 0 0 1 2 11.6Z"
      fill="currentColor"
    />
    <circle cx="8" cy="8.3" r="2.5" fill="#FFFFFF" />
    <circle cx="8" cy="8.3" r="1.15" fill="currentColor" />
  </svg>
);

// 带柄箭头（向下）：排序方向用
export const IconArrowDown = ({ size }: { size?: number }) => (
  <svg width={size ?? 16} height={size ?? 16} viewBox="0 0 16 16" fill="none"
    stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 2.8v10.4M3.8 9 8 13.2 12.2 9" />
  </svg>
);
