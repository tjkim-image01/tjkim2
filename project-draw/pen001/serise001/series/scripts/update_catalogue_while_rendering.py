from publish_series_catalogue import publish
import time
while True:
 counts=publish()
 if sum(counts.values())==30:break
 time.sleep(10)
