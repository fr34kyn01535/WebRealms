export GOPATH=`dirname $SCRIPT`
go generate src\github.com\fr34kyn01535\WebRealms\main.go
go get github.com/golang/protobuf/proto
go get github.com/gorilla/websocket
go get github.com/nu7hatch/gouuid
cd src\github.com\fr34kyn01535\WebRealms\ && go build -o "..\..\..\..\bin\webrealms" webrealms.pb.go hub.go client.go main.go