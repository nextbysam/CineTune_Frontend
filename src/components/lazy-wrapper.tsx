"use client";

import { useState, useRef, useCallback, Suspense } from 'react';
import { useIntersectionObserver } from '@/hooks/use-intersection-observer';

interface LazyWrapperProps {
	children: React.ReactNode;
	fallback?: React.ReactNode;
	threshold?: number;
	rootMargin?: string;
	triggerOnce?: boolean;
	minHeight?: number;
}

export function LazyWrapper({ 
	children, 
	fallback = null, 
	threshold = 0.1,
	rootMargin = '100px',
	triggerOnce = true,
	minHeight = 200
}: LazyWrapperProps) {
	const [isVisible, setIsVisible] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	const onIntersect = useCallback(() => {
		setIsVisible(true);
	}, []);

	useIntersectionObserver(ref, onIntersect, {
		threshold,
		rootMargin,
		triggerOnce
	});

	if (!isVisible) {
		return (
			<div 
				ref={ref} 
				style={{ minHeight: `${minHeight}px` }}
				className="flex items-center justify-center"
			>
				{fallback}
			</div>
		);
	}

	return (
		<Suspense fallback={fallback}>
			{children}
		</Suspense>
	);
}

interface LazyComponentProps {
	component: React.ComponentType<any>;
	props?: any;
	fallback?: React.ReactNode;
	threshold?: number;
	rootMargin?: string;
}

export function LazyComponent({ 
	component: Component, 
	props, 
	...lazyProps 
}: LazyComponentProps) {
	return (
		<LazyWrapper {...lazyProps}>
			<Component {...(props || {})} />
		</LazyWrapper>
	);
}