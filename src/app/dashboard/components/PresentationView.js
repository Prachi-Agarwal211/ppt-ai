'use client';
import React from 'react';
import { usePresentationStore, getElement } from '@/utils/store';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, A11y, Mousewheel } from 'swiper/modules';

// These CSS imports are required here for Swiper to function correctly.
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

// This component renders a single, read-only slide for the presentation mode.
const PresentationSlide = ({ slide }) => {
    const theme = usePresentationStore(state => state.theme);
    const containerStyle = theme.bg_css ? { background: theme.bg_css } : {};
    const imageSuggestionElement = getElement(slide, 'image_suggestion');

    const renderElement = (element) => {
        if (!element) return null;
        
        const style = {
            position: 'absolute',
            left: `${element.position.x}%`,
            top: `${element.position.y}%`,
            width: `${element.size.width}%`,
            height: `${element.size.height}%`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
        };

        switch (element.type) {
            case 'title':
                return <h2 className="text-5xl font-bold text-white text-center drop-shadow-lg" style={style}>{element.content}</h2>;
            case 'content':
                 return <div className="text-2xl text-gray-200 text-left drop-shadow-md" style={style}>{Array.isArray(element.content) && element.content.map((point, i) => <p key={i}>• {point}</p>)}</div>;
            case 'diagram':
                return <div className="w-full h-full bg-white rounded-md" style={style} dangerouslySetInnerHTML={{ __html: element.content }} />;
            default:
                return null;
        }
    };
    
    return (
        <div 
            style={containerStyle}
            className="w-full h-full bg-black/20 rounded-xl border border-white/10 shadow-lg transition-all duration-500 relative overflow-hidden"
        >
            {slide.image_url && <img src={slide.image_url} alt={imageSuggestionElement?.content || ''} className="absolute w-full h-full top-0 left-0 object-cover rounded-xl -z-10" />}
            {slide.elements.map(el => {
                // We don't render the image suggestion itself, only the other elements.
                if(el.type !== 'image_suggestion') {
                    return <div key={el.id}>{renderElement(el)}</div>
                }
                return null;
            })}
        </div>
    );
};

export const PresentationView = () => {
  // Correctly imports and uses the `usePresentationStore` hook.
  const { slides, setActiveSlideId } = usePresentationStore(state => ({ slides: state.slides, setActiveSlideId: state.setActiveSlideId }));

  if (!Array.isArray(slides) || slides.length === 0) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-black text-gray-400">
        This presentation has no slides.
      </div>
    );
  }

  // Updates the global state with the currently active slide for context.
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