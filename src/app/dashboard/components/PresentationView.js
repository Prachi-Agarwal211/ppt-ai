// src/app/dashboard/components/PresentationView.js

'use client';
import React from 'react';
import { usePresentationStore, getElement } from '@/utils/store';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, A11y, Mousewheel } from 'swiper/modules';
import { ElementRenderer } from './ElementRenderer'; // Import the shared renderer

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

const PresentationSlide = ({ slide }) => {
    const theme = usePresentationStore(state => state.theme);
    const containerStyle = theme.bg_css ? { background: theme.bg_css } : {};
    const imageSuggestionElement = getElement(slide, 'image_suggestion');

    return (
        <div 
            style={containerStyle}
            className="w-full h-full bg-black/20 rounded-xl border border-white/10 shadow-lg transition-all duration-500 relative overflow-hidden"
        >
            {slide.image_url && <img src={slide.image_url} alt={imageSuggestionElement?.content || ''} className="absolute w-full h-full top-0 left-0 object-cover rounded-xl -z-10" />}
            {slide.elements.map(el => {
                if (el.type === 'image_suggestion') return null;
                return (
                    <div 
                        key={el.id}
                        style={{
                            position: 'absolute',
                            left: `${el.position.x}%`,
                            top: `${el.position.y}%`,
                            width: `${el.size.width}%`,
                            height: `${el.size.height}%`,
                        }}
                        className="flex flex-col justify-center"
                    >
                       <ElementRenderer element={el} theme={theme} />
                    </div>
                )
            })}
        </div>
    );
};

export const PresentationView = () => {
  const { slides, setActiveSlideId } = usePresentationStore(state => ({ slides: state.slides, setActiveSlideId: state.setActiveSlideId }));

  if (!Array.isArray(slides) || slides.length === 0) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-black text-gray-400">
        This presentation has no slides.
      </div>
    );
  }

  const handleSlideChange = (swiper) => {
    const activeSlide = slides[swiper.activeIndex];
    if (activeSlide) {
        setActiveSlideId(activeSlide.id);
    }
  };

  return (
    <div className="w-full h-full bg-black">
      <Swiper
        modules={[Navigation, Pagination, A11y, Mousewheel]}
        spaceBetween={0}
        slidesPerView={1}
        navigation
        pagination={{ clickable: true }}
        mousewheel
        className="h-full"
        onSlideChange={handleSlideChange}
      >
        {slides.map((slide) => (
          <SwiperSlide key={slide.id} className="flex items-center justify-center p-4 sm:p-8">
            <PresentationSlide slide={slide} />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};