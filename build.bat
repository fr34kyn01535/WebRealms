set GOPATH=%~dp0
go get github.com/golang/protobuf/proto
go get github.com/golang/protobuf/protoc-gen-go
go get github.com/gorilla/websocket
go get github.com/nu7hatch/gouuid
go generate src\github.com\fr34kyn01535\WebRealms\main.go
cd src\github.com\fr34kyn01535\WebRealms\ && go build -o "..\..\..\..\bin\webrealms.exe" webrealms.pb.go hub.go client.go main.go
