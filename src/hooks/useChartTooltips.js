import { useEffect } from 'react';

export const useChartTooltips = (chartContainerId) => {
  useEffect(() => {
    const handleMouseEvents = (e) => {
      const chartContainer = document.getElementById(chartContainerId);
      if (!chartContainer) return;

      const chart = chartContainer.querySelector('.apexcharts-canvas');
      const tooltip = chartContainer.querySelector('.apexcharts-tooltip');
      
      if (!chart || !tooltip) return;

      const isOverChart = chart.contains(e.target);
      const isOverTooltip = tooltip.contains(e.target);
      
      if (isOverChart || isOverTooltip) {
        tooltip.classList.add('active');
      } else {
        tooltip.classList.remove('active');
      }
    };

    let timeout;
    const debouncedHandleMouseEvents = (e) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => handleMouseEvents(e), 50);
    };

    document.addEventListener('mousemove', debouncedHandleMouseEvents);
    document.addEventListener('touchmove', (e) => handleMouseEvents(e.changedTouches[0]));
    document.addEventListener('touchend', (e) => handleMouseEvents(e.changedTouches[0]));

    return () => {
      document.removeEventListener('mousemove', debouncedHandleMouseEvents);
      document.removeEventListener('touchmove', (e) => handleMouseEvents(e.changedTouches[0]));
      document.removeEventListener('touchend', (e) => handleMouseEvents(e.changedTouches[0]));
      clearTimeout(timeout);
    };
  }, [chartContainerId]);
};