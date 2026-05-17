import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 数据 30 秒内视为新鲜，不重新请求 —— 切换页面不闪
      staleTime: 30_000,
      // 缓存保留 5 分钟，期间切回来直接展示
      gcTime: 5 * 60_000,
      // 失败重试 1 次
      retry: 1,
      // 切换窗口时不自动重新获取（避免分心切换 tab 就刷新）
      refetchOnWindowFocus: false,
    },
  },
})
