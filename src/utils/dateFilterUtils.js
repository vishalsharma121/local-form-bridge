export function filterByDateRange(items = [], dateProp = 'createdate', rangeKey = 'all', customStart = '', customEnd = '') {
  if (!Array.isArray(items) || rangeKey === 'all') {
    return items;
  }

  const now = new Date();

  return items.filter((item) => {
    const rawVal = item[dateProp] || item.timestamp || item.createdate;
    if (!rawVal) return false;

    const itemDate = new Date(rawVal);
    if (isNaN(itemDate.getTime())) return false;

    if (rangeKey === 'today') {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return itemDate >= todayStart;
    }

    if (rangeKey === '7days') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);
      return itemDate >= sevenDaysAgo;
    }

    if (rangeKey === '30days') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);
      return itemDate >= thirtyDaysAgo;
    }

    if (rangeKey === 'custom') {
      let isAfterStart = true;
      let isBeforeEnd = true;

      if (customStart) {
        const startDate = new Date(customStart);
        isAfterStart = itemDate >= startDate;
      }

      if (customEnd) {
        const endDate = new Date(customEnd);
        endDate.setHours(23, 59, 59, 999);
        isBeforeEnd = itemDate <= endDate;
      }

      return isAfterStart && isBeforeEnd;
    }

    return true;
  });
}
