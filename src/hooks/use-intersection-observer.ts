import { useEffect, RefObject } from 'react';

interface UseIntersectionObserverOptions {
	threshold?: number | number[];
	rootMargin?: string;
	triggerOnce?: boolean;
	root?: Element | null;
}

export function useIntersectionObserver(
	ref: RefObject<Element | null>,
	callback: (entry: IntersectionObserverEntry) => void,
	options: UseIntersectionObserverOptions = {}
) {
	const { threshold = 0.1, rootMargin = '0px', triggerOnce = false, root = null } = options;

	useEffect(() => {
		const element = ref.current;
		if (!element) return;

		const observer = new IntersectionObserver(
			(entries) => {
				const [entry] = entries;
				if (entry.isIntersecting) {
					callback(entry);
					if (triggerOnce) {
						observer.unobserve(element);
					}
				}
			},
			{
				threshold,
				rootMargin,
				root,
			}
		);

		observer.observe(element);

		return () => {
			observer.unobserve(element);
		};
	}, [ref, callback, threshold, rootMargin, triggerOnce, root]);
}