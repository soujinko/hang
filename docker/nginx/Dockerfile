FROM nginx
VOLUME /etc/letsencrypt

EXPOSE 80
EXPOSE 443

RUN rm -f /etc/nginx/conf.d/*
COPY /home/ubuntu/hang/conf.d/ /etc/nginx/conf.d/
ENTRYPOINT []
CMD ["nginx", "-g","daemon off;"]


